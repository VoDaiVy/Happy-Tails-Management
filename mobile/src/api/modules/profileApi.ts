import { axiosClient } from "../axiosClient";
import type {
  MyProfileResponse,
  ProfileCompletionResponse,
  UpdateProfilePayload,
  UserProfileDetail,
} from "../../types/profile";
import { resolveImageUrl } from "../../utils/image";

function normalizeProfile(profile?: UserProfileDetail): UserProfileDetail {
  return {
    ...(profile || {}),
    avatar: resolveImageUrl(profile?.avatar),
  };
}

export async function getMyProfile() {
  const response = await axiosClient.get<MyProfileResponse>("/profile/me");
  return {
    ...response.data.data,
    profile: normalizeProfile(response.data.data.profile),
  };
}

export async function updateMyProfile(payload: UpdateProfilePayload) {
  const response = await axiosClient.put<{ status: "success" | "error"; message: string; data: { profile: UserProfileDetail } }>(
    "/profile/me",
    payload,
  );
  return {
    ...response.data,
    data: {
      ...response.data.data,
      profile: normalizeProfile(response.data.data.profile),
    },
  };
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

  return {
    ...response.data,
    data: {
      ...response.data.data,
      avatar: resolveImageUrl(response.data.data.avatar),
    },
  };
}

export async function getProfileCompletion() {
  const response = await axiosClient.get<ProfileCompletionResponse>("/profile/completion");
  return response.data.data;
}
