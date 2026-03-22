import { Pressable, StyleSheet, Text } from "react-native";
import { staffTheme } from "../../../../theme/staffTheme";

interface ButtonProps {
  title: string;
  onPress?: () => void;
}

export function PrimaryButton({ title, onPress }: ButtonProps) {
  return (
    <Pressable style={styles.primary} onPress={onPress}>
      <Text style={styles.primaryText}>{title}</Text>
    </Pressable>
  );
}

export function SecondaryButton({ title, onPress }: ButtonProps) {
  return (
    <Pressable style={styles.secondary} onPress={onPress}>
      <Text style={styles.secondaryText}>{title}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  primary: {
    backgroundColor: staffTheme.colors.primary,
    borderRadius: staffTheme.radius.lg,
    minHeight: 44,
    paddingVertical: 11,
    paddingHorizontal: 16,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#E7853E",
    ...staffTheme.shadow.card,
  },
  primaryText: {
    color: "#fff",
    fontWeight: "800",
    fontSize: 14,
    letterSpacing: 0.2,
  },
  secondary: {
    backgroundColor: staffTheme.colors.surfaceAlt,
    borderRadius: staffTheme.radius.lg,
    borderWidth: 1,
    borderColor: staffTheme.colors.borderSoft,
    minHeight: 44,
    paddingVertical: 11,
    paddingHorizontal: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryText: {
    color: staffTheme.colors.textMuted,
    fontWeight: "700",
    fontSize: 13,
  },
});
