import { createNativeStackNavigator } from "@react-navigation/native-stack";
import {
  AdminBookingBoardScreen,
  AdminControlCenterScreen,
  AdminRoomManagementScreen,
  AdminServiceManagementScreen,
  AdminUserManagementScreen,
  AdminVoucherManagementScreen,
} from "../screens/admin";
import type { AdminStackParamList } from "./types";

const Stack = createNativeStackNavigator<AdminStackParamList>();

export function AdminStackNavigator() {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="AdminHome"
        component={AdminControlCenterScreen}
        options={{ title: "Quan tri" }}
      />
      <Stack.Screen name="AdminBookingBoard" component={AdminBookingBoardScreen} options={{ title: "Booking Board" }} />
      <Stack.Screen name="AdminUserManagement" component={AdminUserManagementScreen} options={{ title: "Quan ly nguoi dung" }} />
      <Stack.Screen name="AdminVoucherManagement" component={AdminVoucherManagementScreen} options={{ title: "Quan ly voucher" }} />
      <Stack.Screen name="AdminServiceManagement" component={AdminServiceManagementScreen} options={{ title: "Quan ly service" }} />
      <Stack.Screen name="AdminRoomManagement" component={AdminRoomManagementScreen} options={{ title: "Quan ly room" }} />
    </Stack.Navigator>
  );
}
