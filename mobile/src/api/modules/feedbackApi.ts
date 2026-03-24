import { axiosClient } from "../axiosClient";
import { extractPayload } from "../responseParser";
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
  const payload = extractPayload<{ feedback?: FeedbackItem[] }>(response.data);
  return payload.feedback || [];
}

export async function getEligibleBookingsForFeedback(): Promise<EligibleFeedbackBooking[]> {
  const response = await axiosClient.get<EligibleFeedbackResponse>("/feedback/eligible-bookings");
  const payload = extractPayload<{ bookings?: EligibleFeedbackBooking[] }>(response.data);
  return payload.bookings || [];
}

export async function createFeedback(payload: {
  booking: string;
  service?: string;
  rating: number;
  comment?: string;
}) {
  const response = await axiosClient.post<FeedbackActionResponse>("/feedback", payload);
  return extractPayload<{ feedback?: FeedbackItem }>(response.data);
}

export async function updateFeedback(
  id: string,
  payload: {
    rating?: number;
    comment?: string;
  }
) {
  const response = await axiosClient.put<FeedbackActionResponse>(`/feedback/${id}`, payload);
  return extractPayload<{ feedback?: FeedbackItem }>(response.data);
}

export async function deleteFeedback(id: string) {
  const response = await axiosClient.delete<FeedbackActionResponse>(`/feedback/${id}`);
  return extractPayload<null>(response.data);
}

export async function getMyReceivedFeedback(): Promise<FeedbackItem[]> {
  const response = await axiosClient.get("/feedback/staff/received");
  const payload = extractPayload<{ feedback?: FeedbackItem[] }>(response.data);
  return payload.feedback || [];
}

export async function respondToFeedback(id: string, message: string) {
  const response = await axiosClient.put(`/feedback/${id}/respond`, { message });
  return extractPayload<{ feedback?: FeedbackItem }>(response.data);
}

export async function toggleFeedbackPublishStatus(id: string) {
  const response = await axiosClient.put(`/feedback/${id}/publish`);
  return extractPayload<{ feedback?: FeedbackItem }>(response.data);
}
