import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { staffTheme } from "../../../../theme/staffTheme";
import type { StaffModuleKey } from "../types";

interface StaffDrawerProps {
  visible: boolean;
  active: StaffModuleKey;
  onClose: () => void;
  onNavigate: (module: StaffModuleKey) => void;
}

const MENU_ITEMS: Array<{ key: StaffModuleKey; label: string }> = [
  { key: "overview", label: "Overview" },
  { key: "bookings", label: "Process Bookings" },
  { key: "schedule", label: "Schedule" },
  { key: "feedback", label: "Feedback" },
  { key: "notifications", label: "Notifications" },
  { key: "medical", label: "Medical Records" },
  { key: "news", label: "News" },
];

export function StaffDrawer({ visible, active, onClose, onNavigate }: StaffDrawerProps) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={styles.dim} onPress={onClose} />
        <View style={styles.panel}>
          <Text style={styles.heading}>Staff Menu</Text>
          {MENU_ITEMS.map((item) => {
            const selected = item.key === active;
            return (
              <Pressable
                key={item.key}
                style={[styles.item, selected && styles.itemActive]}
                onPress={() => {
                  onNavigate(item.key);
                  onClose();
                }}
              >
                <Text style={[styles.itemText, selected && styles.itemTextActive]}>{item.label}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    flexDirection: "row",
  },
  dim: {
    flex: 1,
    backgroundColor: "rgba(20, 14, 9, 0.34)",
  },
  panel: {
    width: "72%",
    backgroundColor: "#FFFBF6",
    paddingHorizontal: 14,
    paddingTop: 42,
    borderTopLeftRadius: 26,
    borderBottomLeftRadius: 26,
    borderLeftWidth: 1,
    borderColor: staffTheme.colors.borderSoft,
    gap: 8,
  },
  heading: {
    color: staffTheme.colors.text,
    fontWeight: "800",
    fontSize: 22,
    marginBottom: 8,
  },
  item: {
    borderRadius: 14,
    paddingVertical: 11,
    paddingHorizontal: 12,
  },
  itemActive: {
    backgroundColor: staffTheme.colors.primarySoft,
    borderWidth: 1,
    borderColor: "#F1C9A6",
  },
  itemText: {
    color: staffTheme.colors.textMuted,
    fontWeight: "700",
    fontSize: 14,
  },
  itemTextActive: {
    color: staffTheme.colors.text,
  },
});
