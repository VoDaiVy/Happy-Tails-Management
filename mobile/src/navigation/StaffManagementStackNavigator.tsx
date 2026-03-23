import { createNativeStackNavigator } from "@react-navigation/native-stack";
import {
  StaffBookingsScreen,
  StaffFeaturePlaceholderScreen,
  StaffMedicalRecordsScreen,
  StaffNewsManagementScreen,
  StaffOfflineOrderScreen,
  StaffOverviewScreen,
  StaffScheduleDetailScreen,
  StaffScheduleScreen,
} from "../screens/management/staff";
import type { StaffManagementStackParamList } from "./types";

const Stack = createNativeStackNavigator<StaffManagementStackParamList>();

export function StaffManagementStackNavigator() {
  return (
    <Stack.Navigator initialRouteName="StaffOverview" screenOptions={{ headerShown: false }}>
      <Stack.Screen name="StaffOverview" component={StaffOverviewScreen} />
      <Stack.Screen name="StaffBookings" component={StaffBookingsScreen} />
      <Stack.Screen name="StaffOfflineOrder" component={StaffOfflineOrderScreen} />
      <Stack.Screen name="StaffSchedule" component={StaffScheduleScreen} />
      <Stack.Screen name="StaffScheduleDetail" component={StaffScheduleDetailScreen} />
      <Stack.Screen name="StaffMedicalRecords" component={StaffMedicalRecordsScreen} />
      <Stack.Screen name="StaffNewsManagement" component={StaffNewsManagementScreen} />
    </Stack.Navigator>
  );
}
