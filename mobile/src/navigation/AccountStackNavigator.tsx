import { createNativeStackNavigator } from "@react-navigation/native-stack";
import {
  AccountScreen,
  AIHealthScanScreen,
  BookingCameraScreen,
  BookingDetailScreen,
  ChangePasswordScreen,
  FeedbackScreen,
  MyBookingsScreen,
  MyPetsScreen,
  NotificationCenterScreen,
  ProfileScreen,
  ShoppingCartScreen,
  WalletScreen,
  WalletTransactionDetailScreen,
} from "../screens/account";
import type { AccountStackParamList } from "./types";

const Stack = createNativeStackNavigator<AccountStackParamList>();

export function AccountStackNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="AccountHome" component={AccountScreen} />
      <Stack.Screen name="AIHealthScan" component={AIHealthScanScreen} />
      <Stack.Screen name="Profile" component={ProfileScreen} />
      <Stack.Screen name="MyPets" component={MyPetsScreen} />
      <Stack.Screen name="ShoppingCart" component={ShoppingCartScreen} />
      <Stack.Screen name="MyBookings" component={MyBookingsScreen} />
      <Stack.Screen name="BookingDetail" component={BookingDetailScreen} />
      <Stack.Screen name="BookingCamera" component={BookingCameraScreen} />
      <Stack.Screen name="Wallet" component={WalletScreen} />
      <Stack.Screen name="WalletTransactionDetail" component={WalletTransactionDetailScreen} />
      <Stack.Screen name="ChangePassword" component={ChangePasswordScreen} />
      <Stack.Screen name="NotificationCenter" component={NotificationCenterScreen} />
      <Stack.Screen name="Feedback" component={FeedbackScreen} />
    </Stack.Navigator>
  );
}
