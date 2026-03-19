export interface FeedbackItem {
  _id: string;
  booking?: string;
  service?: string;
  rating: number;
  comment?: string;
  images?: string[];
  isPublished?: boolean;
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
