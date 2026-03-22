import { StyleSheet, Text, View } from "react-native";
import { staffTheme } from "../../../../theme/staffTheme";

interface InfoCardProps {
  title: string;
  description?: string;
  children?: React.ReactNode;
}

export function InfoCard({ title, description, children }: InfoCardProps) {
  return (
    <View style={styles.card}>
      <Text style={styles.title}>{title}</Text>
      {description ? <Text style={styles.description}>{description}</Text> : null}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: staffTheme.colors.surface,
    borderRadius: staffTheme.radius.xl,
    borderWidth: 1,
    borderColor: staffTheme.colors.borderSoft,
    padding: staffTheme.spacing.md,
    gap: 10,
    ...staffTheme.shadow.card,
  },
  title: {
    color: staffTheme.colors.text,
    fontWeight: "800",
    fontSize: staffTheme.font.subheading,
  },
  description: {
    color: staffTheme.colors.textSecondary,
    fontSize: 12,
    lineHeight: 19,
  },
});
