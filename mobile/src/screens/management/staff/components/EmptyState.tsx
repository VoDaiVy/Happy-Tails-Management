import { StyleSheet, Text, View } from "react-native";
import { staffTheme } from "../../../../theme/staffTheme";

interface EmptyStateProps {
  title: string;
  subtitle: string;
}

export function EmptyState({ title, subtitle }: EmptyStateProps) {
  return (
    <View style={styles.wrap}>
      <View style={styles.iconPlate}><Text style={styles.icon}>✦</Text></View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.subtitle}>{subtitle}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: staffTheme.colors.surface,
    borderRadius: staffTheme.radius.xl,
    borderWidth: 1,
    borderColor: staffTheme.colors.borderSoft,
    padding: staffTheme.spacing.xl,
    gap: 8,
    ...staffTheme.shadow.card,
  },
  iconPlate: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: staffTheme.colors.primarySoft,
  },
  icon: {
    fontSize: 18,
    color: staffTheme.colors.primaryStrong,
  },
  title: {
    color: staffTheme.colors.text,
    fontSize: 17,
    fontWeight: "800",
  },
  subtitle: {
    color: staffTheme.colors.textSecondary,
    textAlign: "center",
    fontSize: 13,
    lineHeight: 19,
    maxWidth: 280,
  },
});
