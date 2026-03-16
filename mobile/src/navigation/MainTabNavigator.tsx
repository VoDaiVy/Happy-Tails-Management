import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { AccountScreen } from "../screens/account";
import { ServiceListScreen } from "../screens/services";
import { BookingStackNavigator } from "./BookingStackNavigator";
import type { MainTabParamList } from "./types";

const Tab = createBottomTabNavigator<MainTabParamList>();

export function MainTabNavigator() {
  return (
    <Tab.Navigator screenOptions={{ headerShown: false }}>
      <Tab.Screen name="ServicesTab" component={ServiceListScreen} options={{ title: "Services" }} />
      <Tab.Screen name="BookingTab" component={BookingStackNavigator} options={{ title: "Booking" }} />
      <Tab.Screen name="AccountTab" component={AccountScreen} options={{ title: "Tai khoan" }} />
    </Tab.Navigator>
  );
}
