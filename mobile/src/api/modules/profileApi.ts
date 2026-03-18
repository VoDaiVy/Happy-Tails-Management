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

export async function updateProfileAvatar(payload: {
  uri: string;
  type?: string;
  fileName?: string;
}) {
  const formData = new FormData();
  formData.append("avatar", {
    uri: payload.uri,
    type: payload.type || "image/jpeg",
    name: payload.fileName || `avatar-${Date.now()}.jpg`,
  } as unknown as Blob);

  const response = await axiosClient.put<{
    status: "success" | "error";
    message: string;
    data: { avatar: string };
  }>("/profile/avatar", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });

  return response.data;
}

export async function getProfileCompletion() {
  const response = await axiosClient.get<ProfileCompletionResponse>("/profile/completion");
  return response.data.data;
}
