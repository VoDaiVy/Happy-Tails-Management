import { StyleSheet, Text, View } from "react-native";
import { staffTheme } from "../../../../theme/staffTheme";
import type { MedicalRecordCardModel } from "../types";
import { SecondaryButton } from "./Buttons";
import { StatusBadge } from "./StatusBadge";

interface MedicalRecordCardProps {
  item: MedicalRecordCardModel;
}

export function MedicalRecordCard({ item }: MedicalRecordCardProps) {
  return (
    <View style={styles.card}>
      <View style={styles.topRow}>
        <Text style={styles.title}>{item.pet} · {item.owner}</Text>
        <StatusBadge value={item.status} />
      </View>
      <View style={styles.identityBlock}>
        <Text style={styles.meta}>Record ID: {item.recordId}</Text>
        <Text style={styles.meta}>Type: {item.recordType}</Text>
      </View>
      <Text style={styles.summary}>Summary: {item.summary}</Text>
      <Text style={styles.meta}>Visit date: {item.visitDate}</Text>
      <Text style={styles.meta}>Assigned staff: {item.assignedStaff}</Text>
      <Text style={styles.meta}>Progress: {item.progress}</Text>
      <View style={styles.actionsRow}>
        <View style={styles.actionItem}><SecondaryButton title="View" /></View>
        <View style={styles.actionItem}><SecondaryButton title="Update" /></View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: staffTheme.radius.xl,
    borderWidth: 1,
    borderColor: staffTheme.colors.borderSoft,
    backgroundColor: staffTheme.colors.surface,
    padding: staffTheme.spacing.md,
    gap: 7,
    ...staffTheme.shadow.card,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  title: {
    flex: 1,
    color: staffTheme.colors.text,
    fontWeight: "800",
    fontSize: 15,
  },
  identityBlock: {
    paddingVertical: 6,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: "#F1E8DE",
    gap: 3,
  },
  summary: {
    color: staffTheme.colors.textMuted,
    fontSize: 12,
    lineHeight: 18,
  },
  meta: {
    color: staffTheme.colors.textSecondary,
    fontSize: 12,
  },
  actionsRow: {
    marginTop: 6,
    flexDirection: "row",
    gap: 8,
  },
  actionItem: { flex: 1 },
});
