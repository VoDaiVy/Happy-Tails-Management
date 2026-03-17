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

export type MainTabParamList = {
  ServicesTab: undefined;
  BookingTab: undefined;
  AccountTab: undefined;
};
