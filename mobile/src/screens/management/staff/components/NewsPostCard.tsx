import { Pressable, StyleSheet, Text, View } from "react-native";
import { staffTheme } from "../../../../theme/staffTheme";
import type { NewsPostCardModel } from "../types";
import { StatusBadge } from "./StatusBadge";

interface NewsPostCardProps {
  item: NewsPostCardModel;
}

export function NewsPostCard({ item }: NewsPostCardProps) {
  return (
    <View style={styles.card}>
      <View style={styles.thumb}><Text style={styles.thumbText}>{item.thumbnail}</Text></View>
      <View style={styles.content}>
        <View style={styles.topRow}>
          <Text style={styles.title}>{item.title}</Text>
          <Pressable style={styles.editBtn}><Text style={styles.editText}>Edit</Text></Pressable>
        </View>
        <Text style={styles.meta}>{item.date} · {item.category}</Text>
        <Text style={styles.meta}>Audience: {item.targetAudience}</Text>
        <View style={styles.bottomRow}>
          <StatusBadge value={item.status} />
          <Text style={styles.tag}>{item.tag}</Text>
        </View>
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
    padding: staffTheme.spacing.sm,
    flexDirection: "row",
    gap: 10,
    ...staffTheme.shadow.card,
  },
  thumb: {
    width: 78,
    borderRadius: staffTheme.radius.lg,
    backgroundColor: staffTheme.colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
    padding: 8,
  },
  thumbText: {
    color: staffTheme.colors.text,
    textAlign: "center",
    fontSize: 12,
    fontWeight: "700",
  },
  content: {
    flex: 1,
    gap: 4,
  },
  topRow: {
    flexDirection: "row",
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
  bottomRow: {
    marginTop: 2,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  tag: {
    color: staffTheme.colors.text,
    fontSize: 12,
    fontWeight: "700",
  },
  editBtn: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: staffTheme.colors.borderSoft,
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: staffTheme.colors.surfaceAlt,
  },
  editText: {
    color: staffTheme.colors.text,
    fontWeight: "700",
    fontSize: 12,
  },
});
