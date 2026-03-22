import { Pressable, StyleSheet, Text, View } from "react-native";
import { staffTheme } from "../../../../theme/staffTheme";
import type { ScheduleCardModel } from "../types";
import { StatusBadge } from "./StatusBadge";

interface ScheduleCardProps {
  item: ScheduleCardModel;
}

export function ScheduleCard({ item }: ScheduleCardProps) {
  return (
    <View style={styles.card}>
      <View style={styles.topRow}>
        <Text style={styles.time}>{item.time}</Text>
        <StatusBadge value={item.status} />
      </View>

      <Text style={styles.code}>{item.bookingCode}</Text>
      <View style={styles.mainMetaBlock}>
        <Text style={styles.meta}>Pet: {item.pet}</Text>
        <Text style={styles.meta}>Customer: {item.customer}</Text>
      </View>
      <View style={styles.subMetaBlock}>
        <Text style={styles.meta}>Service: {item.service}</Text>
        <Text style={styles.meta}>Staff: {item.staff}</Text>
      </View>

      <Pressable style={styles.detailIconWrap}>
        <Text style={styles.detailIcon}>›</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    position: "relative",
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
    justifyContent: "space-between",
    alignItems: "center",
  },
  time: {
    color: staffTheme.colors.primaryStrong,
    fontWeight: "800",
    fontSize: 20,
  },
  code: {
    color: staffTheme.colors.text,
    fontWeight: "700",
    fontSize: 14,
  },
  mainMetaBlock: {
    gap: 4,
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderColor: "#F1E8DE",
  },
  subMetaBlock: {
    gap: 3,
  },
  meta: {
    color: staffTheme.colors.textSecondary,
    fontSize: 12,
  },
  detailIconWrap: {
    position: "absolute",
    right: 12,
    bottom: 10,
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: staffTheme.colors.primarySoft,
  },
  detailIcon: {
    color: staffTheme.colors.text,
    fontWeight: "800",
    fontSize: 18,
    lineHeight: 20,
  },
});
