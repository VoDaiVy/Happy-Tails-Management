import { StyleSheet, Text, TextInput, View } from "react-native";
import { staffTheme } from "../../../../theme/staffTheme";

interface SearchBarProps {
  placeholder?: string;
  value?: string;
  onChangeText?: (value: string) => void;
}

export function SearchBar({ placeholder = "Search", value, onChangeText }: SearchBarProps) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.icon}>⌕</Text>
      <TextInput
        style={styles.input}
        placeholder={placeholder}
        placeholderTextColor={staffTheme.colors.textSecondary}
        value={value}
        onChangeText={onChangeText}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderRadius: staffTheme.radius.lg,
    borderWidth: 1,
    borderColor: staffTheme.colors.borderSoft,
    backgroundColor: staffTheme.colors.surface,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    minHeight: 48,
    ...staffTheme.shadow.card,
  },
  icon: {
    color: staffTheme.colors.textMuted,
    fontSize: 17,
    marginRight: 10,
  },
  input: {
    flex: 1,
    color: staffTheme.colors.text,
    fontSize: staffTheme.font.bodyLg,
    paddingVertical: 10,
  },
});
