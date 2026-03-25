export interface FeedbackItem {
  _id: string;
  user?:
    | string
    | {
        _id?: string;
        name?: string;
        email?: string;
      };
  booking?:
    | string
    | {
        _id?: string;
        bookingNumber?: string;
        bookingDate?: string;
      };
  service?:
    | string
    | {
        _id?: string;
        name?: string;
      };
  staff?:
    | string
    | {
        _id?: string;
        name?: string;
        email?: string;
      };
  rating: number;
  comment?: string;
  images?: string[];
  isPublished?: boolean;
  response?: {
    message?: string;
    respondedBy?:
      | string
      | {
          _id?: string;
          name?: string;
          email?: string;
        };
    respondedAt?: string;
  };
  createdAt: string;
}

export interface EligibleFeedbackService {
  _id: string;
  service?: {
    _id: string;
    name?: string;
  };
  hasReviewed?: boolean;
}

export interface EligibleFeedbackBooking {
  _id: string;
  bookingDate?: string;
  bookingNumber?: string;
  allReviewed?: boolean;
  items: EligibleFeedbackService[];
}
