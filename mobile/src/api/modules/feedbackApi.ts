import { axiosClient } from "../axiosClient";
import type { EligibleFeedbackBooking, FeedbackItem } from "../../types/feedback";

interface FeedbackListResponse {
  status: "success" | "error";
  data: {
    feedback: FeedbackItem[];
  };
}

interface EligibleFeedbackResponse {
  status: "success" | "error";
  data: {
    bookings: EligibleFeedbackBooking[];
  };
}

interface FeedbackActionResponse {
  status: "success" | "error";
  message: string;
  data?: {
    feedback?: FeedbackItem;
  } | null;
}

export async function getMyFeedback(): Promise<FeedbackItem[]> {
  const response = await axiosClient.get<FeedbackListResponse>("/feedback/my");
  return response.data.data.feedback;
}

export async function getEligibleBookingsForFeedback(): Promise<EligibleFeedbackBooking[]> {
  const response = await axiosClient.get<EligibleFeedbackResponse>("/feedback/eligible-bookings");
  return response.data.data.bookings;
}

export async function createFeedback(payload: {
  booking: string;
  service?: string;
  rating: number;
  comment?: string;
}) {
  const response = await axiosClient.post<FeedbackActionResponse>("/feedback", payload);
  return response.data;
}

export async function updateFeedback(
  id: string,
  payload: {
    rating?: number;
    comment?: string;
  }
) {
  const response = await axiosClient.put<FeedbackActionResponse>(`/feedback/${id}`, payload);
  return response.data;
}

export async function deleteFeedback(id: string) {
  const response = await axiosClient.delete<FeedbackActionResponse>(`/feedback/${id}`);
  return response.data;
}
