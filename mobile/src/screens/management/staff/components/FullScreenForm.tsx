import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { staffTheme } from "../../../../theme/staffTheme";

interface FullScreenFormProps {
  visible: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}

export function FullScreenForm({ visible, title, onClose, children }: FullScreenFormProps) {
  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>{title}</Text>
          <Pressable onPress={onClose} style={styles.closeBtn}><Text style={styles.closeText}>Close</Text></Pressable>
        </View>
        <View style={styles.content}>{children}</View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: staffTheme.colors.appBg,
    paddingTop: 46,
  },
  header: {
    paddingHorizontal: staffTheme.spacing.lg,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderColor: staffTheme.colors.borderSoft,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  title: {
    color: staffTheme.colors.text,
    fontWeight: "800",
    fontSize: 22,
  },
  closeBtn: {
    minHeight: 36,
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: staffTheme.colors.borderSoft,
    borderRadius: 12,
    backgroundColor: staffTheme.colors.surfaceAlt,
    alignItems: "center",
    justifyContent: "center",
  },
  closeText: {
    color: staffTheme.colors.text,
    fontWeight: "700",
    fontSize: 12,
  },
  content: {
    flex: 1,
    paddingHorizontal: staffTheme.spacing.lg,
    paddingTop: staffTheme.spacing.md,
    paddingBottom: staffTheme.spacing.sm,
  },
});
