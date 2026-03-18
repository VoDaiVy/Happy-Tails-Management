import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { useAuth } from "../context/AuthContext";
import { AccountStackNavigator } from "./AccountStackNavigator";
import { ServiceListScreen } from "../screens/services";
import { BookingStackNavigator } from "./BookingStackNavigator";
import type { MainTabParamList } from "./types";
import { NewsPolicyScreen } from "../screens/info/NewsPolicyScreen";
import { ManagementScreen } from "../screens/management/ManagementScreen";
import { canUseCustomerFeatures, isStaffOrAdminRole } from "../utils/role";

const Tab = createBottomTabNavigator<MainTabParamList>();

export function MainTabNavigator() {
  const { user } = useAuth();
  const showCustomerTabs = canUseCustomerFeatures(user?.role);
  const showManagementTab = isStaffOrAdminRole(user?.role);

  return (
    <Tab.Navigator screenOptions={{ headerShown: false }}>
      <Tab.Screen name="ServicesTab" component={ServiceListScreen} options={{ title: "Services" }} />
      {showCustomerTabs ? <Tab.Screen name="BookingTab" component={BookingStackNavigator} options={{ title: "Booking" }} /> : null}
      <Tab.Screen name="InfoTab" component={NewsPolicyScreen} options={{ title: "News & Policy" }} />
      {showManagementTab ? <Tab.Screen name="ManagementTab" component={ManagementScreen} options={{ title: "Management" }} /> : null}
      <Tab.Screen name="AccountTab" component={AccountStackNavigator} options={{ title: "Tai khoan" }} />
    </Tab.Navigator>
  );
}
