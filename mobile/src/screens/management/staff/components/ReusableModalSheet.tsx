import { Modal, Pressable, StyleSheet, View } from "react-native";
import { staffTheme } from "../../../../theme/staffTheme";

interface ReusableModalSheetProps {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

export function ReusableModalSheet({ visible, onClose, children }: ReusableModalSheetProps) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        <View style={styles.sheet}>{children}</View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(15, 20, 29, 0.36)",
  },
  sheet: {
    maxHeight: "88%",
    backgroundColor: "#FFFCF8",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    borderColor: staffTheme.colors.borderSoft,
    padding: staffTheme.spacing.lg,
    ...staffTheme.shadow.elevated,
  },
});
