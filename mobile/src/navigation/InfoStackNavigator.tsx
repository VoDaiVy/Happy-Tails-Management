import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { NewsDetailScreen, NewsPolicyScreen, PolicyDetailScreen } from "../screens/info";
import type { InfoStackParamList } from "./types";

const Stack = createNativeStackNavigator<InfoStackParamList>();

export function InfoStackNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="NewsPolicyHome" component={NewsPolicyScreen} />
      <Stack.Screen name="NewsDetail" component={NewsDetailScreen} />
      <Stack.Screen name="PolicyDetail" component={PolicyDetailScreen} />
    </Stack.Navigator>
  );
}
