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
  NewsPolicyHome:
    | {
        initialTab?: "news" | "policy";
      }
    | undefined;
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
  Feedback:
    | {
        bookingId?: string;
        serviceId?: string;
      }
    | undefined;
};

export type StaffManagementStackParamList = {
  StaffOverview: undefined;
  StaffBookings:
    | {
        refreshAt?: number;
        toastMessage?: string;
      }
    | undefined;
  StaffOfflineOrder: undefined;
  StaffSchedule:
    | {
        refreshAt?: number;
        toastMessage?: string;
      }
    | undefined;
  StaffScheduleDetail: {
    bookingId: string;
  };
  StaffMedicalRecords: undefined;
  StaffNewsManagement: undefined;
};

export type AdminStackParamList = {
  AdminHome: undefined;
  AdminBookingBoard: undefined;
  AdminUserManagement: undefined;
  AdminRoomManagement: undefined;
  AdminServiceManagement: undefined;
  AdminMedicalRecords: undefined;
  AdminTransactions: undefined;
  AdminTransactionDetail: {
    transactionId: string;
  };
  AdminVoucherManagement: undefined;
};

export type MainTabParamList = {
  ServicesTab: NavigatorScreenParams<ServicesStackParamList> | undefined;
  BookingTab: NavigatorScreenParams<BookingStackParamList> | undefined;
  InfoTab: NavigatorScreenParams<InfoStackParamList> | undefined;
  ManagementTab: NavigatorScreenParams<StaffManagementStackParamList> | undefined;
  AdminTab: NavigatorScreenParams<AdminStackParamList> | undefined;
  AccountTab: NavigatorScreenParams<AccountStackParamList> | undefined;
};
