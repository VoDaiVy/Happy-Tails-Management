import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { ServiceDetailScreen, ServiceListScreen } from "../screens/services";
import type { ServicesStackParamList } from "./types";

const Stack = createNativeStackNavigator<ServicesStackParamList>();

export function ServicesStackNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="ServiceList" component={ServiceListScreen} />
      <Stack.Screen name="ServiceDetail" component={ServiceDetailScreen} />
    </Stack.Navigator>
  );
}
