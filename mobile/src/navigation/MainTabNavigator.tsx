import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { AccountStackNavigator } from "./AccountStackNavigator";
import { ServiceListScreen } from "../screens/services";
import { BookingStackNavigator } from "./BookingStackNavigator";
import { AdminStackNavigator } from "./AdminStackNavigator";
import { useAuth } from "../context/AuthContext";
import type { MainTabParamList } from "./types";

const Tab = createBottomTabNavigator<MainTabParamList>();

export function MainTabNavigator() {
  const { user } = useAuth();
  const canAccessAdmin = user?.role === "admin" || user?.role === "staff";

  return (
    <Tab.Navigator screenOptions={{ headerShown: false }}>
      <Tab.Screen name="ServicesTab" component={ServiceListScreen} options={{ title: "Services" }} />
      <Tab.Screen name="BookingTab" component={BookingStackNavigator} options={{ title: "Booking" }} />
      {canAccessAdmin ? (
        <Tab.Screen name="AdminTab" component={AdminStackNavigator} options={{ title: "Quan tri" }} />
      ) : null}
      <Tab.Screen name="AccountTab" component={AccountStackNavigator} options={{ title: "Tai khoan" }} />
    </Tab.Navigator>
  );
}
