import { StyleSheet, Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { StaffManagementStackParamList } from "../../navigation/types";

type Props = NativeStackScreenProps<
  StaffManagementStackParamList,
  "StaffSchedule" | "StaffMedicalRecords" | "StaffOfflineOrder"
>;

const PLACEHOLDER_COPY: Record<keyof Pick<StaffManagementStackParamList, "StaffSchedule" | "StaffMedicalRecords" | "StaffOfflineOrder">, { title: string; description: string }> = {
  StaffOfflineOrder: {
    title: "Create Offline Order",
    description: "Offline order workflow is being optimized for staff mobile booking processing.",
  },
  StaffSchedule: {
    title: "Schedule",
    description: "Schedule management is being optimized for mobile staff workflow.",
  },
  StaffMedicalRecords: {
    title: "Medical Records",
    description: "Medical records workspace is coming soon with complete staff tools.",
  },
};

export function StaffFeaturePlaceholderScreen({ route }: Props) {
  const content = PLACEHOLDER_COPY[route.name];

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.badge}>STAFF</Text>
        <Text style={styles.title}>{content.title}</Text>
        <Text style={styles.description}>{content.description}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F1EB",
    paddingHorizontal: 16,
    paddingTop: 104,
  },
  card: {
    borderWidth: 1,
    borderColor: "#E8DFD2",
    borderRadius: 16,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 18,
    paddingVertical: 16,
    gap: 6,
  },
  badge: {
    alignSelf: "flex-start",
    backgroundColor: "#F7E0CF",
    color: "#A85425",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.6,
  },
  title: {
    color: "#253345",
    fontSize: 22,
    fontWeight: "900",
  },
  description: {
    color: "#6C7A90",
    fontSize: 14,
    lineHeight: 20,
  },
});
