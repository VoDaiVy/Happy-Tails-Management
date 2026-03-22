import { Pressable, ScrollView, StyleSheet, Text } from "react-native";
import { staffTheme } from "../../../../theme/staffTheme";

interface FilterChipGroupProps {
  options: string[];
  selected: string;
  onSelect: (value: string) => void;
}

export function FilterChipGroup({ options, selected, onSelect }: FilterChipGroupProps) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
      {options.map((option) => {
        const active = option === selected;
        return (
          <Pressable key={option} style={[styles.chip, active && styles.chipActive]} onPress={() => onSelect(option)}>
            <Text style={[styles.chipText, active && styles.chipTextActive]}>{option}</Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: {
    gap: 10,
    paddingVertical: 2,
  },
  chip: {
    minHeight: 36,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: staffTheme.colors.borderSoft,
    backgroundColor: staffTheme.colors.chipBg,
    justifyContent: "center",
  },
  chipActive: {
    backgroundColor: staffTheme.colors.primarySoft,
    borderColor: "#F1C49A",
  },
  chipText: {
    color: staffTheme.colors.textMuted,
    fontWeight: "600",
    fontSize: 13,
  },
  chipTextActive: {
    color: staffTheme.colors.text,
    fontWeight: "800",
  },
});
