import type { NavigatorScreenParams } from "@react-navigation/native";

export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
  VerifyOtp: {
    email: string;
    canAutoLogin: boolean;
  };
};

export type BookingStackParamList = {
  BookingCheckout: undefined;
  BookingConfirmation: {
    bookingId: string;
    message?: string;
    totalAmount?: number;
  };
};

export type AccountStackParamList = {
  AccountHome: undefined;
  Profile: undefined;
  MyPets: undefined;
  ShoppingCart: undefined;
  MyBookings: undefined;
  BookingDetail: {
    bookingId: string;
  };
  Wallet: undefined;
};

export type MainTabParamList = {
  ServicesTab: undefined;
  BookingTab: undefined;
  AccountTab: NavigatorScreenParams<AccountStackParamList> | undefined;
};
