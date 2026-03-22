import { StyleSheet, Text, View } from "react-native";
import { staffTheme } from "../../../../theme/staffTheme";
import type { BookingCardModel } from "../types";
import { SecondaryButton } from "./Buttons";
import { StatusBadge } from "./StatusBadge";

interface BookingCardProps {
  item: BookingCardModel;
}

export function BookingCard({ item }: BookingCardProps) {
  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <Text style={styles.bookingCode}>{item.id}</Text>
        <StatusBadge value={item.status} />
      </View>

      <View style={styles.metaBlock}>
        <Text style={styles.primaryText}>{item.customerName}</Text>
        <Text style={styles.metaText}>{item.email}</Text>
      </View>

      <View style={styles.bodyBlock}>
        <Text style={styles.metaText}>Date: {item.dateTime}</Text>
        <Text style={styles.metaText}>Service: {item.service}</Text>
        <Text style={styles.metaText}>Payment: {item.paymentMethod} · {item.paymentStatus}</Text>
      </View>

      <View style={styles.footerRow}>
        <View>
          <Text style={styles.footerLabel}>Total</Text>
          <Text style={styles.amount}>{item.amount}</Text>
        </View>
        <View style={styles.buttonWrap}>
          <SecondaryButton title="View Details" />
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
    padding: staffTheme.spacing.md,
    gap: 10,
    ...staffTheme.shadow.card,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  bookingCode: {
    color: staffTheme.colors.text,
    fontWeight: "800",
    fontSize: 15,
  },
  metaBlock: {
    gap: 2,
  },
  primaryText: {
    color: staffTheme.colors.text,
    fontWeight: "800",
    fontSize: 15,
  },
  bodyBlock: {
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: "#F1E8DE",
    paddingVertical: 8,
    gap: 4,
  },
  metaText: {
    color: staffTheme.colors.textSecondary,
    fontSize: 12,
  },
  footerRow: {
    marginTop: 2,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  footerLabel: {
    color: staffTheme.colors.textSecondary,
    fontSize: 11,
    fontWeight: "700",
  },
  amount: {
    color: staffTheme.colors.text,
    fontWeight: "800",
    fontSize: 16,
  },
  buttonWrap: {
    minWidth: 115,
  },
});
