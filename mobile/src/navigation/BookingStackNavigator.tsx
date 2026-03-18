import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { BookingCameraScreen } from "../screens/account/BookingCameraScreen";
import { BookingDetailScreen } from "../screens/account/BookingDetailScreen";
import { MyBookingsScreen } from "../screens/account/MyBookingsScreen";
import { BookingCheckoutScreen, BookingConfirmationScreen } from "../screens/booking";
import type { BookingStackParamList } from "./types";

const Stack = createNativeStackNavigator<BookingStackParamList>();

export function BookingStackNavigator() {
  return (
    <Stack.Navigator initialRouteName="MyBookings" screenOptions={{ headerShown: false }}>
      <Stack.Screen name="MyBookings" component={MyBookingsScreen} />
      <Stack.Screen name="BookingDetail" component={BookingDetailScreen} />
      <Stack.Screen name="BookingCamera" component={BookingCameraScreen} />
      <Stack.Screen name="BookingCheckout" component={BookingCheckoutScreen} />
      <Stack.Screen name="BookingConfirmation" component={BookingConfirmationScreen} />
    </Stack.Navigator>
  );
}
