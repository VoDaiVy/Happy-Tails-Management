import type { NavigatorScreenParams } from "@react-navigation/native";

export type AuthStackParamList = {
  Landing: undefined;
  Login: undefined;
  Register: undefined;
  ForgotPassword: {
    email?: string;
  } | undefined;
  ResetPassword: {
    resetToken?: string;
  } | undefined;
  VerifyOtp: {
    email: string;
    canAutoLogin: boolean;
  };
};

export type ServicesStackParamList = {
  ServiceList: undefined;
  ServiceDetail: {
    serviceId: string;
  };
};

export type BookingStackParamList = {
  MyBookings: undefined;
  BookingDetail: {
    bookingId: string;
    toastMessage?: string;
  };
  BookingCamera: {
    bookingId?: string;
  } | undefined;
  BookingCheckout: undefined;
  BookingConfirmation: {
    bookingId: string;
    message?: string;
    totalAmount?: number;
  };
};

export type InfoStackParamList = {
  NewsPolicyHome: undefined;
  NewsDetail: {
    slug: string;
    title?: string;
  };
  PolicyDetail: {
    slug: string;
    title?: string;
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
    toastMessage?: string;
  };
  BookingCamera: {
    bookingId?: string;
  } | undefined;
  Wallet:
    | {
        orderCode?: string;
        payment?: string;
      }
    | undefined;
  WalletTransactionDetail: {
    transactionId: string;
  };
  ChangePassword: undefined;
  NotificationCenter: undefined;
  Feedback: undefined;
};

export type MainTabParamList = {
  ServicesTab: NavigatorScreenParams<ServicesStackParamList> | undefined;
  BookingTab: NavigatorScreenParams<BookingStackParamList> | undefined;
  InfoTab: NavigatorScreenParams<InfoStackParamList> | undefined;
  ManagementTab: undefined;
  AccountTab: NavigatorScreenParams<AccountStackParamList> | undefined;
};
