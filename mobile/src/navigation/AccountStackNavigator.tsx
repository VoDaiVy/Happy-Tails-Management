import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { AccountScreen } from "../screens/account/AccountScreen";
import { BookingDetailScreen } from "../screens/account/BookingDetailScreen";
import { BookingCameraScreen } from "../screens/account/BookingCameraScreen";
import { ChangePasswordScreen } from "../screens/account/ChangePasswordScreen";
import { FeedbackScreen } from "../screens/account/FeedbackScreen";
import { MyBookingsScreen } from "../screens/account/MyBookingsScreen";
import { MyPetsScreen } from "../screens/account/MyPetsScreen";
import { NotificationCenterScreen } from "../screens/account/NotificationCenterScreen";
import { ProfileScreen } from "../screens/account/ProfileScreen";
import { ShoppingCartScreen } from "../screens/account/ShoppingCartScreen";
import { WalletScreen } from "../screens/account/WalletScreen";
import { WalletTransactionDetailScreen } from "../screens/account/WalletTransactionDetailScreen";
import type { AccountStackParamList } from "./types";

const Stack = createNativeStackNavigator<AccountStackParamList>();

export function AccountStackNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="AccountHome" component={AccountScreen} />
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
