import { Feather } from "@expo/vector-icons";
import { ScrollView, StyleSheet, Text, View } from "react-native";

export interface AdminWorkspaceMetric {
  label: string;
  value: string;
  icon: React.ComponentProps<typeof Feather>["name"];
}

interface Props {
  title: string;
  subtitle: string;
  roleLabel: "ADMIN" | "STAFF" | "CUSTOMER";
  routeLabel: string;
  metrics: AdminWorkspaceMetric[];
  notes?: string[];
}

export function AdminWorkspaceTemplate({ title, subtitle, roleLabel, routeLabel, metrics, notes = [] }: Props) {
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.heroCard}>
        <View style={styles.heroBadgeRow}>
          <Text style={styles.roleBadge}>{roleLabel}</Text>
          <Text style={styles.routeText}>{routeLabel}</Text>
        </View>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.subtitle}>{subtitle}</Text>
      </View>

      <View style={styles.metricGrid}>
        {metrics.map((metric) => (
          <View key={metric.label} style={styles.metricCard}>
            <View style={styles.metricIconWrap}>
              <Feather name={metric.icon} size={16} color="#D47438" />
            </View>
            <Text style={styles.metricValue}>{metric.value}</Text>
            <Text style={styles.metricLabel}>{metric.label}</Text>
          </View>
        ))}
      </View>

      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Mobile rollout notes</Text>
        {notes.length === 0 ? (
          <Text style={styles.noteText}>This module is aligned with web flow and ready for next implementation slice.</Text>
        ) : (
          notes.map((note) => (
            <View key={note} style={styles.noteRow}>
              <View style={styles.noteDot} />
              <Text style={styles.noteText}>{note}</Text>
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FCF8F2",
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 24,
    gap: 12,
  },
  heroCard: {
    borderRadius: 18,
    backgroundColor: "#FFFDF9",
    borderWidth: 1,
    borderColor: "#EEE2D5",
    padding: 14,
    gap: 8,
  },
  heroBadgeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  roleBadge: {
    backgroundColor: "#E47E41",
    color: "#FFFFFF",
    borderRadius: 999,
    overflow: "hidden",
    paddingHorizontal: 10,
    paddingVertical: 4,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.6,
  },
  routeText: {
    color: "#B07A59",
    fontSize: 12,
    fontWeight: "700",
  },
  title: {
    color: "#20354D",
    fontSize: 22,
    fontWeight: "800",
  },
  subtitle: {
    color: "#66788D",
    fontSize: 13,
    lineHeight: 20,
  },
  metricGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  metricCard: {
    width: "48%",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#EFE1D2",
    backgroundColor: "#FFFFFF",
    padding: 12,
    gap: 5,
  },
  metricIconWrap: {
    width: 30,
    height: 30,
    borderRadius: 10,
    backgroundColor: "#FFF0E5",
    alignItems: "center",
    justifyContent: "center",
  },
  metricValue: {
    color: "#A6532E",
    fontSize: 18,
    fontWeight: "800",
  },
  metricLabel: {
    color: "#6A7889",
    fontSize: 12,
    fontWeight: "600",
  },
  sectionCard: {
    borderRadius: 14,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#EEE2D5",
    padding: 13,
    gap: 8,
  },
  sectionTitle: {
    color: "#24374E",
    fontSize: 15,
    fontWeight: "800",
  },
  noteRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
  },
  noteDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    marginTop: 6,
    backgroundColor: "#D47A44",
  },
  noteText: {
    flex: 1,
    color: "#5E7085",
    lineHeight: 20,
    fontSize: 13,
  },
});
