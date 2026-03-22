import { StyleSheet, Text, View } from "react-native";
import { staffTheme } from "../../../../theme/staffTheme";
import type { NotificationCardModel } from "../types";
import { SecondaryButton } from "./Buttons";
import { StatusBadge } from "./StatusBadge";

interface NotificationCardProps {
  item: NotificationCardModel;
}

export function NotificationCard({ item }: NotificationCardProps) {
  return (
    <View style={styles.card}>
      <View style={styles.topRow}>
        <Text style={styles.title}>{item.title}</Text>
        <StatusBadge value={item.status} />
      </View>
      <Text style={styles.meta}>Type: {item.type}</Text>
      <Text style={styles.meta}>Audience: {item.targetAudience}</Text>
      <View style={styles.metaDivider} />
      <Text style={styles.meta}>Created by: {item.createdBy}</Text>
      <Text style={styles.meta}>Created date: {item.createdDate}</Text>
      <Text style={styles.meta}>Scheduled at: {item.scheduledAt}</Text>
      <Text style={styles.meta}>Delivery: {item.delivery}</Text>
      <View style={styles.actionsRow}>
        <View style={styles.actionItem}><SecondaryButton title="Edit" /></View>
        <View style={styles.actionItem}><SecondaryButton title="Preview" /></View>
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
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 8,
  },
  title: {
    flex: 1,
    color: staffTheme.colors.text,
    fontWeight: "800",
    fontSize: 15,
  },
  meta: {
    color: staffTheme.colors.textSecondary,
    fontSize: 12,
  },
  metaDivider: {
    height: 1,
    backgroundColor: "#F1E8DE",
    marginVertical: 1,
  },
  actionsRow: {
    marginTop: 6,
    flexDirection: "row",
    gap: 8,
  },
  actionItem: { flex: 1 },
});
