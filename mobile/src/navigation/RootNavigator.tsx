import { LinkingOptions, NavigationContainer } from "@react-navigation/native";
import * as ExpoLinking from "expo-linking";
import { ActivityIndicator, View } from "react-native";
import { useAuth } from "../context/AuthContext";
import { isStaffOrAdminRole } from "../utils/role";
import type { MainTabParamList } from "./types";
import { AuthNavigator } from "./AuthNavigator";
import { MainTabNavigator } from "./MainTabNavigator";
import { StaffAdminTabNavigator } from "./StaffAdminTabNavigator";

const linking: LinkingOptions<MainTabParamList> = {
  prefixes: [ExpoLinking.createURL("/"), "happytails://"],
  config: {
    screens: {
      ServicesTab: {
        screens: {
          ServiceList: "services",
          ServiceDetail: "services/:serviceId",
        },
      },
      BookingTab: {
        screens: {
          MyBookings: "bookings",
        },
      },
      InfoTab: "info",
      ManagementTab: "management",
      AccountTab: {
        screens: {
          Wallet: "wallet",
        },
      },
    },
  },
};

export function RootNavigator() {
  const { isBootstrapping, isAuthenticated, user } = useAuth();

  if (isBootstrapping) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <NavigationContainer linking={linking}>
      {isAuthenticated ? (isStaffOrAdminRole(user?.role) ? <StaffAdminTabNavigator /> : <MainTabNavigator />) : <AuthNavigator />}
    </NavigationContainer>
  );
}
