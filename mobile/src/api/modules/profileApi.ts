import { axiosClient } from "../axiosClient";
import type {
  MyProfileResponse,
  ProfileCompletionResponse,
  UpdateProfilePayload,
  UserProfileDetail,
} from "../../types/profile";

export async function getMyProfile() {
  const response = await axiosClient.get<MyProfileResponse>("/profile/me");
  return response.data.data;
}

export async function updateMyProfile(payload: UpdateProfilePayload) {
  const response = await axiosClient.put<{ status: "success" | "error"; message: string; data: { profile: UserProfileDetail } }>(
    "/profile/me",
    payload,
  );
  return response.data;
}

export async function getProfileCompletion() {
  const response = await axiosClient.get<ProfileCompletionResponse>("/profile/completion");
  return response.data.data;
}
