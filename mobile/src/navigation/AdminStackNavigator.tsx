import { createNativeStackNavigator } from "@react-navigation/native-stack";
import {
  AdminBookingBoardScreen,
  AdminControlCenterScreen,
  AdminMedicalRecordsScreen,
  AdminTransactionDetailScreen,
  AdminRoomManagementScreen,
  AdminServiceManagementScreen,
  AdminTransactionsScreen,
  AdminUserManagementScreen,
  AdminVoucherManagementScreen,
} from "../screens/admin";
import type { AdminStackParamList } from "./types";

const Stack = createNativeStackNavigator<AdminStackParamList>();

export function AdminStackNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen
        name="AdminHome"
        component={AdminControlCenterScreen}
      />
      <Stack.Screen name="AdminBookingBoard" component={AdminBookingBoardScreen} />
      <Stack.Screen name="AdminUserManagement" component={AdminUserManagementScreen} />
      <Stack.Screen name="AdminVoucherManagement" component={AdminVoucherManagementScreen} />
      <Stack.Screen name="AdminServiceManagement" component={AdminServiceManagementScreen} />
      <Stack.Screen name="AdminRoomManagement" component={AdminRoomManagementScreen} />
      <Stack.Screen name="AdminMedicalRecords" component={AdminMedicalRecordsScreen} />
      <Stack.Screen name="AdminTransactions" component={AdminTransactionsScreen} />
      <Stack.Screen name="AdminTransactionDetail" component={AdminTransactionDetailScreen} />
    </Stack.Navigator>
  );
}
