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
    marginBottom: 6,
    flexDirection: "row",
    backgroundColor: "rgba(255, 252, 248, 0.96)",
    borderWidth: 1,
    borderColor: "#E2D2C2",
    borderRadius: 20,
    paddingHorizontal: 6,
    paddingTop: 6,
    gap: 6,
    shadowColor: "#1E150F",
    shadowOpacity: 0.14,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 7 },
    elevation: 5,
  },
  item: {
    flex: 1,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 46,
    paddingVertical: 4,
    gap: 2,
  },
  itemActive: {
    backgroundColor: "#FFF3EA",
    borderWidth: 1,
    borderColor: "#EAB995",
  },
  icon: {
    color: "#8D7E71",
    fontSize: 13,
    fontWeight: "700",
  },
  iconActive: {
    color: staffTheme.colors.primaryStrong,
  },
  label: {
    color: "#8D7E71",
    fontSize: 10,
    fontWeight: "800",
  },
  labelActive: {
    color: "#473B33",
    fontWeight: "900",
  },
});
