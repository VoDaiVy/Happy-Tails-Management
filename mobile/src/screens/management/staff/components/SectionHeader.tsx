import { StyleSheet, Text, View } from "react-native";
import { staffTheme } from "../../../../theme/staffTheme";

interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}

export function SectionHeader({ title, subtitle, action }: SectionHeaderProps) {
  return (
    <View style={styles.row}>
      <View style={{ flex: 1 }}>
        <Text style={styles.title}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
      {action ? <View>{action}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: staffTheme.spacing.xs,
    gap: staffTheme.spacing.md,
  },
  title: {
    color: staffTheme.colors.text,
    fontSize: staffTheme.font.title,
    fontWeight: "800",
    letterSpacing: 0.2,
  },
  subtitle: {
    marginTop: staffTheme.spacing.xxs,
    color: staffTheme.colors.textSecondary,
    fontSize: staffTheme.font.body,
    lineHeight: 20,
  },
});
