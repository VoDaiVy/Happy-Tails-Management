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
import type { AccountStackParamList } from "./types";

const Stack = createNativeStackNavigator<AccountStackParamList>();

export function AccountStackNavigator() {
  return (
    <Stack.Navigator>
      <Stack.Screen name="AccountHome" component={AccountScreen} options={{ title: "Tai khoan" }} />
      <Stack.Screen name="Profile" component={ProfileScreen} options={{ title: "Profile" }} />
      <Stack.Screen name="MyPets" component={MyPetsScreen} options={{ title: "My Pets" }} />
      <Stack.Screen name="ShoppingCart" component={ShoppingCartScreen} options={{ title: "Shopping Cart" }} />
      <Stack.Screen name="MyBookings" component={MyBookingsScreen} options={{ title: "Bookings" }} />
      <Stack.Screen name="BookingDetail" component={BookingDetailScreen} options={{ title: "Booking Detail" }} />
      <Stack.Screen name="BookingCamera" component={BookingCameraScreen} options={{ title: "Booking Camera" }} />
      <Stack.Screen name="Wallet" component={WalletScreen} options={{ title: "Wallet" }} />
      <Stack.Screen name="ChangePassword" component={ChangePasswordScreen} options={{ title: "Change Password" }} />
      <Stack.Screen name="NotificationCenter" component={NotificationCenterScreen} options={{ title: "Notifications" }} />
      <Stack.Screen name="Feedback" component={FeedbackScreen} options={{ title: "Feedback" }} />
    </Stack.Navigator>
  );
}
