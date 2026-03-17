import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { BookingCheckoutScreen, BookingConfirmationScreen } from "../screens/booking";
import type { BookingStackParamList } from "./types";

const Stack = createNativeStackNavigator<BookingStackParamList>();

export function BookingStackNavigator() {
  return (
    <Stack.Navigator>
      <Stack.Screen name="BookingCheckout" component={BookingCheckoutScreen} options={{ title: "Dat lich" }} />
      <Stack.Screen name="BookingConfirmation" component={BookingConfirmationScreen} options={{ title: "Xac nhan dat lich" }} />
    </Stack.Navigator>
  );
}
