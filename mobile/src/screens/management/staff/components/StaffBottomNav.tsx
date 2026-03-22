import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { staffTheme } from "../../../../theme/staffTheme";
import type { StaffModuleKey } from "../types";

interface StaffBottomNavProps {
  active: StaffModuleKey;
  onChange: (value: StaffModuleKey) => void;
}

const PRIMARY_ITEMS: Array<{ key: StaffModuleKey; label: string; icon: string }> = [
  { key: "overview", label: "Overview", icon: "◫" },
  { key: "bookings", label: "Bookings", icon: "▤" },
  { key: "schedule", label: "Schedule", icon: "◷" },
  { key: "news", label: "News", icon: "◉" },
];

export function StaffBottomNav({ active, onChange }: StaffBottomNavProps) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.wrap, { paddingBottom: Math.max(insets.bottom, staffTheme.spacing.xs) }]}> 
      {PRIMARY_ITEMS.map((item) => {
        const isActive = active === item.key;
        return (
          <Pressable key={item.key} style={[styles.item, isActive && styles.itemActive]} onPress={() => onChange(item.key)}>
            <Text style={[styles.icon, isActive && styles.iconActive]}>{item.icon}</Text>
            <Text style={[styles.label, isActive && styles.labelActive]}>{item.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginHorizontal: staffTheme.spacing.lg,
    marginBottom: staffTheme.spacing.sm,
    flexDirection: "row",
    backgroundColor: staffTheme.colors.surface,
    borderWidth: 1,
    borderColor: "#EADBCB",
    borderRadius: 20,
    paddingHorizontal: 6,
    paddingTop: 6,
    gap: 6,
    ...staffTheme.shadow.card,
  },
  item: {
    flex: 1,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 46,
    paddingVertical: 4,
    gap: 1,
  },
  itemActive: {
    backgroundColor: staffTheme.colors.primarySoft,
    borderWidth: 1,
    borderColor: "#EFCBAE",
  },
  icon: {
    color: staffTheme.colors.textSecondary,
    fontSize: 13,
    fontWeight: "700",
  },
  iconActive: {
    color: staffTheme.colors.primaryStrong,
  },
  label: {
    color: staffTheme.colors.textSecondary,
    fontSize: 9,
    fontWeight: "700",
  },
  labelActive: {
    color: staffTheme.colors.text,
    fontWeight: "800",
  },
});
